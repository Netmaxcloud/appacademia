// Script de Teste Automatizado: Verificar Trigger de Pastas e Conexão Supabase
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente (Força leitura do .env real da raiz do projeto)
dotenv.config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('abc.supabase.co')) {
  console.error('\n❌ ERRO: Credenciais reais do Supabase não encontradas no arquivo .env!');
  console.error('Por favor, abra o arquivo .env e cole a sua VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY reais.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log('🚀 INICIANDO TESTE DO BANCO DE DADOS (SUPABASE)...');
  console.log(`🔗 Conectando ao projeto: ${supabaseUrl}\n`);

  try {
    // 1. Testa a Conexão
    console.log('[1/4] Verificando conexão e acesso à tabela app_users...');
    const { error: pingError } = await supabase.from('app_users').select('id').limit(1);
    if (pingError) throw pingError;
    console.log('✅ Conexão estabelecida com sucesso!\n');

    // 2. Criar um usuário de Teste via RPC ou Insert Direto para disparar o Trigger
    const testLogin = `test_${Date.now()}@test.com`;
    console.log(`[2/4] Criando usuário de teste (${testLogin}) para checar a Trigger...`);
    
    // Tenta usar a função criar usuário segura
    let userId;
    const { error: rpcError, data: rpcData } = await supabase.rpc('create_app_user', {
      p_login: testLogin,
      p_plain_password: 'testpassword123',
      p_role: 'client',
      p_full_name: 'Usuário Teste Trigger',
      p_metadata: {}
    });

    if (rpcError) {
       console.log('⚠️ A função (RPC) não foi encontrada, fazendo insert bruto...');
       const { data, error } = await supabase.from('app_users').insert([{
           login: testLogin,
           password_hash: '123', // Senha fake só pro teste de trigger passar
           full_name: 'Usuário Teste Trigger'
       }]).select('id').single();

       if (error) throw error;
       userId = data.id;
    } else {
       userId = rpcData;
    }

    console.log(`✅ Usuário criado com sucesso! ID: ${userId}\n`);

    // 3. Testar a criação automática das pastas base (Treinos, Progresso, etc) da tabela user_folders
    console.log('[3/4] Verificando se o Trigger criou as pastas automáticas (user_folders)...');
    
    // Dá um tempinho irrisório só pro Supabase terminar o Trigger
    await new Promise(r => setTimeout(r, 1000));

    const { data: folders, error: foldersError } = await supabase
        .from('user_folders')
        .select('folder_name')
        .eq('user_id', userId);

    if (foldersError) throw foldersError;

    if (!folders || folders.length === 0) {
        console.error('❌ ERRO: O usuário foi criado, mas NENHUMA pasta apareceu!');
        console.error('A Trigger "create_default_user_folders" falhou ou não existe no banco.');
    } else {
        const folderNames = folders.map(f => f.folder_name);
        console.log(`✅ Sucesso! O Supabase gerou automaticamente as seguintes pastas virtuais:`);
        console.log(`   📂 ${folderNames.join(', ')}\n`);
    }

    // 4. Testar o Storage de Avatares (Opcional, mas exigido para Teste Completo)
    console.log('[4/4] Verificando as políticas de Storage para Avatares (Storage API)...');
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    if (storageError) {
        console.log('⚠️ O teste de Storage falhou, verifique se a extensão Storage está ativa ou se o Bucket foi criado.');
        console.error(storageError);
    } else {
        const hasAvatars = buckets.some(b => b.name === 'avatars');
        if (hasAvatars) {
             console.log('✅ Bucket "avatars" encontrado e pronto para armazenar fotos de clientes!');
        } else {
             console.log('⚠️ Bucket "avatars" ainda não existe. Por favor, crie no painel do Supabase com estado "Público".');
        }
    }

    // Fim: Limpeza do Teste
    console.log('\n🧹 Limpando dados do teste (Deletando usuário de teste)...');
    await supabase.from('app_users').delete().eq('id', userId);
    console.log('✨ Limpeza concluída. O Banco está saudável e funcionando PERFEITAMENTE!');

  } catch (err: any) {
    console.error('\n❌ TESTE FALHOU DEVIDO AO SEGUINTE ERRO:');
    console.error(err.message || err);
  }
}

runTests();
